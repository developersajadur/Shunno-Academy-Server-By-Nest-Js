import { Module } from '@nestjs/common';
import { CourseModuleController } from './course-module.controller';
import { CourseModuleService } from './course-module.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CourseModuleController],
  providers: [CourseModuleService],
  exports: [CourseModuleService],
})
export class CourseModuleModule {}
