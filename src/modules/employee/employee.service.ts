import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { calculatePagination } from '../../common/utils/query.helper';
import {
  EmployeeQueryDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';

@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllEmployees(filters: EmployeeQueryDto) {
    const { searchTerm, status, department, ...paginationOptions } = filters;
    const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

    const andConditions: Prisma.EmployeeWhereInput[] = [];

    if (searchTerm) {
      andConditions.push({
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { employeeId: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } },
          { designation: { contains: searchTerm, mode: 'insensitive' } },
          { department: { contains: searchTerm, mode: 'insensitive' } },
        ],
      });
    }

    if (status) {
      andConditions.push({ status });
    }

    if (department) {
      andConditions.push({ department });
    }

    const where: Prisma.EmployeeWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

    const [employees, total, totalActive, totalStudentsReferred] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: {
          _count: {
            select: { students: true },
          },
        },
        skip,
        take: limit,
        orderBy: sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
      }),
      this.prisma.employee.count({ where }),
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: {
          employeeId: { not: null },
        },
      }),
    ]);

    const totalPage = Math.ceil(total / limit);

    return {
      meta: {
        page,
        limit,
        total,
        totalPage,
        totalActive,
        totalStudentsReferred,
      },
      data: employees,
    };
  }

  async getEmployeeById(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true },
        },
        students: {
          select: {
            id: true,
            studentId: true,
            name: true,
            email: true,
            phone: true,
            district: true,
            isEmailVerified: true,
            createdAt: true,
            enrollments: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async createEmployee(payload: CreateEmployeeDto) {
    const cleanEmployeeId = payload.employeeId.trim().toUpperCase();

    const existing = await this.prisma.employee.findUnique({
      where: { employeeId: cleanEmployeeId },
    });

    if (existing) {
      throw new ConflictException(
        `এমপ্লয়ি আইডি "${cleanEmployeeId}" ইতোমধ্যে অন্য একজন এমপ্লয়ীর জন্য ব্যবহৃত হচ্ছে!`,
      );
    }

    const employee = await this.prisma.employee.create({
      data: {
        employeeId: cleanEmployeeId,
        name: payload.name.trim(),
        email: payload.email?.trim() || null,
        phone: payload.phone?.trim() || null,
        designation: payload.designation?.trim() || 'Admission Advisor',
        department: payload.department?.trim() || 'Marketing & Admissions',
        status: payload.status || 'ACTIVE',
        notes: payload.notes?.trim() || null,
      },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    return employee;
  }

  async updateEmployee(id: string, payload: UpdateEmployeeDto) {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    if (payload.employeeId && payload.employeeId.trim().toUpperCase() !== existing.employeeId) {
      const cleanNewId = payload.employeeId.trim().toUpperCase();
      const duplicate = await this.prisma.employee.findUnique({
        where: { employeeId: cleanNewId },
      });

      if (duplicate) {
        throw new ConflictException(`এমপ্লয়ি আইডি "${cleanNewId}" ইতোমধ্যে ব্যবহৃত হচ্ছে!`);
      }
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...payload,
        employeeId: payload.employeeId ? payload.employeeId.trim().toUpperCase() : undefined,
      },
    });

    return updated;
  }

  async deleteEmployee(id: string) {
    const existing = await this.prisma.employee.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    await this.prisma.employee.delete({
      where: { id },
    });

    return { success: true, message: 'এমপ্লয়ি সফলভাবে মুছে ফেলা হয়েছে।' };
  }

  async verifyEmployeeCode(code: string) {
    const cleanCode = code.trim().toUpperCase();
    const employee = await this.prisma.employee.findUnique({
      where: { employeeId: cleanCode },
      select: {
        id: true,
        employeeId: true,
        name: true,
        designation: true,
        department: true,
        status: true,
      },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return {
        valid: false,
        message: 'এমপ্লয়ি আইডি খুঁজে পাওয়া যায়নি বা এটি নিষ্ক্রিয় রয়েছে।',
      };
    }

    return {
      valid: true,
      employee,
    };
  }
}
