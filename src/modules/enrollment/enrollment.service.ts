import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { EnrollmentStatus, PaymentStatus, Prisma } from '@prisma/client';
import { calculatePagination } from '../../common/utils/query.helper';
import {
  EnrollmentQueryDto,
  CreateEnrollmentDto,
  UpdateEnrollmentStatusDto,
} from './dto/enrollment.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async createEnrollment(userId: string | undefined, payload: CreateEnrollmentDto) {
    if (!userId) {
      throw new UnauthorizedException(
        'কোর্সে ভর্তি হতে অনুগ্রহ করে আগে আপনার অ্যাকাউন্টে লগইন করুন।',
      );
    }

    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: payload.courseId }, { slug: payload.courseId }],
      },
    });

    if (!course) {
      throw new NotFoundException('কোর্সটি খুঁজে পাওয়া যায়নি (Course not found)!');
    }

    if (course.isEnrollmentClosed) {
      throw new BadRequestException('এই কোর্সে ভর্তি বর্তমানে বন্ধ রয়েছে (Admission Closed)!');
    }

    if (course.enrollmentDeadline && new Date(course.enrollmentDeadline).getTime() < Date.now()) {
      throw new BadRequestException('এই ব্যাচে ভর্তির সময়সীমা সমাপ্ত হয়ে গেছে!');
    }

    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: userId,
        courseId: course.id,
        status: {
          in: [EnrollmentStatus.APPROVED, EnrollmentStatus.PENDING],
        },
      },
      include: {
        payment: true,
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === EnrollmentStatus.APPROVED) {
        throw new BadRequestException(
          'আপনি ইতিমধ্যে এই কোর্সে ভর্তি হয়েছেন (Already Enrolled)! ড্যাশবোর্ডে গিয়ে ক্লাস অ্যাক্সেস করুন।',
        );
      }
      if (existingEnrollment.status === EnrollmentStatus.PENDING && existingEnrollment.payment) {
        throw new BadRequestException(
          'এই কোর্সে আপনার একটি এনরোলমেন্ট আবেদন ইতিমধ্যে প্রক্রিয়াধীন রয়েছে (Payment Verification Pending)।',
        );
      }
      if (!existingEnrollment.payment) {
        await this.prisma.enrollment.delete({
          where: { id: existingEnrollment.id },
        });
      }
    }

    if (payload.transactionId) {
      const existingTrx = await this.prisma.payment.findUnique({
        where: { transactionId: payload.transactionId },
      });
      if (existingTrx) {
        throw new ConflictException(
          'এই Transaction ID (TrxID) টি ইতিমধ্যে ব্যবহার করা হয়েছে! অনুগ্রহ করে আপনার সঠিক TrxID দিন।',
        );
      }
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const orderId = `SA-2026-${randomSuffix}`;

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const enr = await tx.enrollment.create({
        data: {
          orderId,
          studentId: userId,
          studentName: payload.studentName,
          studentPhone: payload.studentPhone,
          studentEmail: payload.studentEmail,
          district: payload.district,
          occupation: payload.occupation,
          batchSchedule: payload.batchSchedule,
          courseId: course.id,
          totalAmount: course.priceBDT,
          status: EnrollmentStatus.PENDING,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnail: true,
              priceBDT: true,
              mode: true,
            },
          },
        },
      });

      if (payload.paymentMethod && payload.senderNumber && payload.transactionId) {
        await tx.payment.create({
          data: {
            enrollmentId: enr.id,
            method: payload.paymentMethod,
            senderNumber: payload.senderNumber,
            transactionId: payload.transactionId,
            amount: course.priceBDT,
            status: PaymentStatus.PENDING,
            paymentRemarks: payload.paymentRemarks,
          },
        });
      }

      return enr;
    });

    if (payload.transactionId) {
      this.queueService
        .addEmailJob({
          to: enrollment.studentEmail,
          subject: `Payment Submitted for Order ${enrollment.orderId} - Shunno Academy`,
          template: 'PAYMENT_SUBMITTED',
          context: {
            name: enrollment.studentName,
            orderId: enrollment.orderId,
            trxId: payload.transactionId,
            amount: course.priceBDT,
          },
        })
        .catch(() => {});
    }

    return enrollment;
  }

  async getEnrollmentByOrderId(orderId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { orderId },
      include: {
        course: true,
        payment: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment order not found!');
    }

    return enrollment;
  }

  async getMyEnrollments(userId: string) {
    return this.prisma.enrollment.findMany({
      where: {
        studentId: userId,
        status: {
          in: [EnrollmentStatus.APPROVED, EnrollmentStatus.PENDING],
        },
        payment: {
          isNot: null,
        },
        course: {
          isPublished: true,
        },
      },
      include: {
        course: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkEnrollmentStatus(userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: courseId }, { slug: courseId }],
      },
    });

    if (!course) {
      return { isEnrolled: false, isPending: false, status: null, enrollment: null };
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId: userId,
        courseId: course.id,
        status: {
          in: [EnrollmentStatus.APPROVED, EnrollmentStatus.PENDING],
        },
        payment: {
          isNot: null,
        },
      },
      include: {
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!enrollment) {
      return { isEnrolled: false, isPending: false, status: null, enrollment: null };
    }

    return {
      isEnrolled: enrollment.status === EnrollmentStatus.APPROVED,
      isPending: enrollment.status === EnrollmentStatus.PENDING,
      status: enrollment.status,
      enrollment: {
        id: enrollment.id,
        orderId: enrollment.orderId,
        status: enrollment.status,
        createdAt: enrollment.createdAt,
      },
    };
  }

  async getAllEnrollmentsAdmin(filters: EnrollmentQueryDto) {
    const { status, searchTerm, ...paginationOptions } = filters;
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

    const andConditions: Prisma.EnrollmentWhereInput[] = [];

    if (status) {
      andConditions.push({ status });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { orderId: { contains: searchTerm, mode: 'insensitive' } },
          { studentName: { contains: searchTerm, mode: 'insensitive' } },
          { studentPhone: { contains: searchTerm, mode: 'insensitive' } },
          { studentEmail: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.EnrollmentWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        include: {
          course: { select: { id: true, title: true, slug: true, priceBDT: true } },
          payment: true,
          student: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: enrollments,
    };
  }

  async updateEnrollmentStatus(
    id: string,
    adminUserId: string,
    payload: UpdateEnrollmentStatusDto,
  ) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { course: true, payment: true },
    });

    if (!existing) {
      throw new NotFoundException('Enrollment record not found!');
    }

    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: {
        status: payload.status,
        adminNotes: payload.adminNotes,
        approvedAt: payload.status === EnrollmentStatus.APPROVED ? new Date() : undefined,
        approvedById: payload.status === EnrollmentStatus.APPROVED ? adminUserId : undefined,
      },
      include: { course: true, payment: true },
    });

    if (payload.status === EnrollmentStatus.APPROVED) {
      this.queueService
        .addEnrollmentJob({
          enrollmentId: updated.id,
          courseId: updated.courseId,
          action: 'APPROVED',
        })
        .catch(() => {});

      this.queueService
        .addEmailJob({
          to: updated.studentEmail,
          subject: `ভর্তি অনুমোদন ও পেমেন্ট নিশ্চিতকরণ - ${updated.course.title}`,
          template: 'ENROLLMENT_APPROVED',
          context: {
            name: updated.studentName,
            orderId: updated.orderId,
            courseTitle: updated.course.title,
            batchSchedule: updated.batchSchedule,
          },
        })
        .catch(() => {});
    }

    return updated;
  }

  async deleteEnrollment(id: string) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!existing) {
      throw new NotFoundException('Enrollment record not found!');
    }

    return this.prisma.$transaction(async (tx) => {
      if (existing.payment) {
        await tx.payment.deleteMany({
          where: { enrollmentId: id },
        });
      }

      return tx.enrollment.delete({
        where: { id },
      });
    });
  }
}
