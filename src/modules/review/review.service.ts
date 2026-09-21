import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants';
import { calculatePagination } from '../../common/utils/query.helper';
import { ReviewQueryDto, CreateReviewDto, ApproveReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getApprovedReviews(courseId?: string) {
    const where = {
      isApproved: true,
      courseId: courseId || undefined,
    };

    const cacheKey = courseId ? `reviews:course:${courseId}` : CACHE_KEYS.REVIEWS;

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.review.findMany({
          where,
          include: {
            course: {
              select: { id: true, title: true, slug: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      },
      CACHE_TTL.MEDIUM,
    );
  }

  async getAllReviewsAdmin(filters: ReviewQueryDto = {}) {
    const { searchTerm, isApproved, isFeatured, rating, courseId, ...paginationOptions } =
      filters;
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

    const andConditions: Prisma.ReviewWhereInput[] = [];

    if (typeof isApproved === 'boolean') {
      andConditions.push({ isApproved });
    }

    if (typeof isFeatured === 'boolean') {
      andConditions.push({ isFeatured });
    }

    if (rating !== undefined) {
      andConditions.push({ rating: Number(rating) });
    }

    if (courseId) {
      andConditions.push({ courseId });
    }

    if (searchTerm) {
      andConditions.push({
        OR: [
          { studentName: { contains: searchTerm, mode: 'insensitive' } },
          { comment: { contains: searchTerm, mode: 'insensitive' } },
          { studentTitle: { contains: searchTerm, mode: 'insensitive' } },
          { course: { title: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
          { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
        ],
      });
    }

    const where: Prisma.ReviewWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          course: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.review.count({ where }),
    ]);

    const totalPage = Math.ceil(total / limit);

    return {
      meta: { page, limit, total, totalPage },
      data: reviews,
    };
  }

  async createReview(userId: string | undefined, payload: CreateReviewDto) {
    const review = await this.prisma.review.create({
      data: {
        ...payload,
        userId: userId || undefined,
        date:
          payload.date ||
          new Date().toLocaleDateString('bn-BD', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
      },
    });

    await this.redis.delByPattern('reviews:*');
    return review;
  }

  async updateApproval(id: string, payload: ApproveReviewDto) {
    const review = await this.prisma.review.update({
      where: { id },
      data: payload,
    });

    await this.redis.delByPattern('reviews:*');
    return review;
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.delete({
      where: { id },
    });

    await this.redis.delByPattern('reviews:*');
    return review;
  }
}
