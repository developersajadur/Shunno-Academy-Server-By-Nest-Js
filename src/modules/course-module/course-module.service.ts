import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import {
  CreateModuleDto,
  UpdateModuleDto,
  CreateLectureDto,
  UpdateLectureDto,
} from './dto/course-module.dto';

@Injectable()
export class CourseModuleService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- MODULES ----------------
  async createModule(payload: CreateModuleDto) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: payload.courseId }, { slug: payload.courseId }],
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lastModule = await this.prisma.courseModule.findFirst({
      where: { courseId: course.id },
      orderBy: { order: 'desc' },
    });

    const order = payload.order ?? (lastModule ? lastModule.order + 1 : 1);

    const module = await this.prisma.courseModule.create({
      data: {
        courseId: course.id,
        moduleNumber: payload.moduleNumber,
        title: payload.title,
        description: payload.description,
        order,
      },
      include: {
        lectures: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return module;
  }

  async updateModule(id: string, payload: UpdateModuleDto) {
    const existing = await this.prisma.courseModule.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Module not found');
    }

    const updated = await this.prisma.courseModule.update({
      where: { id },
      data: payload,
      include: {
        lectures: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return updated;
  }

  async deleteModule(id: string) {
    const existing = await this.prisma.courseModule.findUnique({
      where: { id },
      include: { lectures: true },
    });

    if (!existing) {
      throw new NotFoundException('Module not found');
    }

    const lecturesToDeleteCount = existing.lectures.length;

    await this.prisma.$transaction(async (tx) => {
      await tx.courseLecture.deleteMany({
        where: { moduleId: id },
      });

      await tx.courseModule.delete({
        where: { id },
      });

      if (lecturesToDeleteCount > 0) {
        await tx.course.update({
          where: { id: existing.courseId },
          data: {
            totalLectures: {
              decrement: lecturesToDeleteCount,
            },
          },
        });
      }
    });

    return { message: 'Module deleted successfully' };
  }

  async getModulesByCourseId(
    courseIdOrSlug: string,
    userId?: string,
    userRole?: UserRole,
  ) {
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }],
      },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            englishName: true,
            designation: true,
            avatar: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let isAuthorized = userRole === UserRole.ADMIN || userRole === UserRole.STAFF;

    if (!isAuthorized && userId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: userId,
          courseId: course.id,
          status: EnrollmentStatus.APPROVED,
        },
      });
      if (enrollment) {
        isAuthorized = true;
      }
    }

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId: course.id },
      include: {
        lectures: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ moduleNumber: 'asc' }, { order: 'asc' }],
    });

    const sanitizedModules = modules.map((mod: any) => ({
      ...mod,
      lectures: mod.lectures.map((lec: any) => ({
        ...lec,
        videoUrl: isAuthorized || lec.isPreview ? lec.videoUrl : null,
        isLocked: !isAuthorized && !lec.isPreview,
      })),
    }));

    return {
      course: {
        id: course.id,
        title: course.title,
        bengaliTitle: course.bengaliTitle,
        slug: course.slug,
        thumbnail: course.thumbnail,
        duration: course.duration,
        totalLectures: course.totalLectures,
        mentor: course.mentor,
      },
      isAuthorized,
      modules: sanitizedModules,
    };
  }

  // ---------------- LECTURES ----------------
  async createLecture(payload: CreateLectureDto) {
    const module = await this.prisma.courseModule.findUnique({
      where: { id: payload.moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    const lastLecture = await this.prisma.courseLecture.findFirst({
      where: { moduleId: payload.moduleId },
      orderBy: { order: 'desc' },
    });

    const order = payload.order ?? (lastLecture ? lastLecture.order + 1 : 1);

    const lecture = await this.prisma.$transaction(async (tx) => {
      const lec = await tx.courseLecture.create({
        data: {
          moduleId: payload.moduleId,
          title: payload.title,
          duration: payload.duration,
          videoUrl: payload.videoUrl,
          isPreview: payload.isPreview ?? false,
          order,
        },
      });

      await tx.courseModule.update({
        where: { id: payload.moduleId },
        data: {
          lecturesCount: {
            increment: 1,
          },
        },
      });

      await tx.course.update({
        where: { id: module.courseId },
        data: {
          totalLectures: {
            increment: 1,
          },
        },
      });

      return lec;
    });

    return lecture;
  }

  async updateLecture(id: string, payload: UpdateLectureDto) {
    const existing = await this.prisma.courseLecture.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Lecture not found');
    }

    const updated = await this.prisma.courseLecture.update({
      where: { id },
      data: payload,
    });

    return updated;
  }

  async deleteLecture(id: string) {
    const existing = await this.prisma.courseLecture.findUnique({
      where: { id },
      include: { module: true },
    });

    if (!existing) {
      throw new NotFoundException('Lecture not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseLecture.delete({
        where: { id },
      });

      await tx.courseModule.update({
        where: { id: existing.moduleId },
        data: {
          lecturesCount: {
            decrement: 1,
          },
        },
      });

      await tx.course.update({
        where: { id: existing.module.courseId },
        data: {
          totalLectures: {
            decrement: 1,
          },
        },
      });
    });

    return { message: 'Lecture deleted successfully' };
  }
}
