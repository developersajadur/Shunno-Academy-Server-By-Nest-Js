import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueService } from '../../queue/queue.service';
import { InquiryStatus, Prisma } from '@prisma/client';
import { calculatePagination } from '../../common/utils/query.helper';
import { InquiryQueryDto, CreateInquiryDto } from './dto/inquiry.dto';

@Injectable()
export class InquiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async createInquiry(userId: string | undefined, payload: CreateInquiryDto) {
    const inquiry = await this.prisma.inquiry.create({
      data: {
        ...payload,
        userId: userId || undefined,
      },
    });

    this.queueService
      .addEmailJob({
        to: payload.email,
        subject: 'Thank you for reaching out to Shunno Academy',
        template: 'INQUIRY_RECEIVED',
        context: { name: payload.fullName, subject: payload.subject },
      })
      .catch(() => {});

    return inquiry;
  }

  async getAllInquiriesAdmin(filters: InquiryQueryDto) {
    const { status, searchTerm, ...paginationOptions } = filters;
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

    const andConditions: Prisma.InquiryWhereInput[] = [];

    if (status) {
      andConditions.push({ status });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { fullName: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { subject: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.InquiryWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [inquiries, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.inquiry.count({ where }),
    ]);

    return {
      meta: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit),
      },
      data: inquiries,
    };
  }

  async updateInquiryStatus(id: string, status: InquiryStatus) {
    return this.prisma.inquiry.update({
      where: { id },
      data: { status },
    });
  }

  async deleteInquiry(id: string) {
    return this.prisma.inquiry.delete({
      where: { id },
    });
  }
}
