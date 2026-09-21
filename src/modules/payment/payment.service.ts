import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { EnrollmentStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { calculatePagination } from '../../common/utils/query.helper';
import { PaymentQueryDto, SubmitTrxDto, VerifyPaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async submitTrx(payload: SubmitTrxDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: payload.enrollmentId },
      include: { course: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment order record not found!');
    }

    const existingTrx = await this.prisma.payment.findUnique({
      where: { transactionId: payload.transactionId },
    });

    if (existingTrx) {
      throw new ConflictException(
        'This Transaction ID (TrxID) has already been submitted! If this is an error, please contact helpline.',
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        enrollmentId: enrollment.id,
        method: payload.method,
        senderNumber: payload.senderNumber,
        transactionId: payload.transactionId,
        amount: payload.amount,
        status: PaymentStatus.PENDING,
        bankName: payload.bankName,
        accountNumber: payload.accountNumber,
        paymentRemarks: payload.paymentRemarks,
        receiptUrl: payload.receiptUrl,
      },
      include: {
        enrollment: {
          include: { course: true },
        },
      },
    });

    this.queueService
      .addEmailJob({
        to: enrollment.studentEmail,
        subject: `Payment Submitted for Order ${enrollment.orderId} - Shunno Academy`,
        template: 'PAYMENT_SUBMITTED',
        context: {
          name: enrollment.studentName,
          orderId: enrollment.orderId,
          trxId: payload.transactionId,
          amount: payload.amount,
        },
      })
      .catch(() => {});

    return payment;
  }

  async getAllPaymentsAdmin(filters: PaymentQueryDto) {
    const { status, method, searchTerm, ...paginationOptions } = filters;
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

    const andConditions: Prisma.PaymentWhereInput[] = [];

    if (status) {
      andConditions.push({ status });
    }

    if (method) {
      andConditions.push({ method });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { transactionId: { contains: searchTerm, mode: 'insensitive' } },
          { senderNumber: { contains: searchTerm, mode: 'insensitive' } },
          { enrollment: { orderId: { contains: searchTerm, mode: 'insensitive' } } },
          { enrollment: { studentName: { contains: searchTerm, mode: 'insensitive' } } },
          { enrollment: { studentEmail: { contains: searchTerm, mode: 'insensitive' } } },
          { enrollment: { studentPhone: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.PaymentWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          enrollment: {
            include: {
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: payments,
    };
  }

  async verifyPaymentAdmin(id: string, adminUserId: string, payload: VerifyPaymentDto) {
    const existing = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        enrollment: {
          include: { course: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Payment record not found!');
    }

    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id },
        data: {
          status: payload.status,
          paymentRemarks: payload.paymentRemarks,
          verifiedAt: payload.status === PaymentStatus.VERIFIED ? new Date() : undefined,
          verifiedById: payload.status === PaymentStatus.VERIFIED ? adminUserId : undefined,
        },
        include: {
          enrollment: {
            include: { course: true },
          },
        },
      });

      if (payload.status === PaymentStatus.VERIFIED) {
        await tx.enrollment.update({
          where: { id: existing.enrollmentId },
          data: {
            status: EnrollmentStatus.APPROVED,
            approvedAt: new Date(),
            approvedById: adminUserId,
          },
        });
      }

      return payment;
    });

    if (payload.status === PaymentStatus.VERIFIED) {
      this.queueService
        .addEnrollmentJob({
          enrollmentId: existing.enrollmentId,
          courseId: existing.enrollment.courseId,
          action: 'APPROVED',
        })
        .catch(() => {});

      this.queueService
        .addEmailJob({
          to: existing.enrollment.studentEmail,
          subject: `ভর্তি অনুমোদন ও পেমেন্ট নিশ্চিতকরণ - ${existing.enrollment.course.title}`,
          template: 'ENROLLMENT_APPROVED',
          context: {
            name: existing.enrollment.studentName,
            orderId: existing.enrollment.orderId,
            courseTitle: existing.enrollment.course.title,
            batchSchedule: existing.enrollment.batchSchedule,
          },
        })
        .catch(() => {});
    }

    return updatedPayment;
  }
}
