import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserQueryDto } from './dto/user-query.dto';
import { calculatePagination } from '../../common/utils/query.helper';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers(filters: UserQueryDto) {
    const { searchTerm, role, isBlocked, employeeId, ...paginationOptions } = filters;
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

    const andConditions: Prisma.UserWhereInput[] = [];

    if (searchTerm) {
      andConditions.push({
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { district: { contains: searchTerm, mode: 'insensitive' } },
          { studentId: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (role) {
      andConditions.push({ role });
    }

    if (typeof isBlocked === 'boolean') {
      andConditions.push({ isBlocked });
    }

    if (employeeId) {
      andConditions.push({ employeeId });
    }

    const where: Prisma.UserWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          studentId: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          avatar: true,
          district: true,
          occupation: true,
          employeeId: true,
          isBlocked: true,
          isEmailVerified: true,
          createdAt: true,
          _count: {
            select: {
              enrollments: true,
              reviews: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPage = Math.ceil(total / limit);

    return {
      meta: { page, limit, total, totalPage },
      data: users,
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        studentId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        district: true,
        occupation: true,
        fatherName: true,
        fatherPhone: true,
        guardianName: true,
        guardianPhone: true,
        address: true,
        nidNumber: true,
        country: true,
        employeeId: true,
        isBlocked: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          include: {
            course: { select: { title: true, slug: true, thumbnail: true } },
            payment: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    return user;
  }

  async toggleBlockStatus(id: string, isBlocked: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found!');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Cannot block an administrator account!');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isBlocked },
      select: {
        id: true,
        name: true,
        email: true,
        isBlocked: true,
      },
    });

    return updatedUser;
  }
}
