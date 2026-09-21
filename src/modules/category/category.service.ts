import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CACHE_KEYS, CACHE_TTL } from '../../common/constants';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getAll() {
    return this.redis.getOrSet(
      CACHE_KEYS.CATEGORIES,
      async () => {
        return this.prisma.category.findMany({
          orderBy: { order: 'asc' },
          include: {
            _count: {
              select: { courses: true },
            },
          },
        });
      },
      CACHE_TTL.LONG,
    );
  }

  async getBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        courses: {
          where: { isPublished: true },
          include: { mentor: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found!');
    }

    return category;
  }

  async create(payload: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: payload as any,
    });
    await this.redis.del(CACHE_KEYS.CATEGORIES);
    return category;
  }

  async update(id: string, payload: UpdateCategoryDto) {
    const category = await this.prisma.category.update({
      where: { id },
      data: payload,
    });
    await this.redis.del(CACHE_KEYS.CATEGORIES);
    return category;
  }

  async delete(id: string) {
    const category = await this.prisma.category.delete({
      where: { id },
    });
    await this.redis.del(CACHE_KEYS.CATEGORIES);
    return category;
  }
}
