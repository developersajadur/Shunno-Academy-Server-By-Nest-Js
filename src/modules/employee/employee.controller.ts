import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { EmployeeService } from './employee.service';
import {
  EmployeeQueryDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from './dto/employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Employees')
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Public()
  @Get('verify/:code')
  @ApiOperation({ summary: 'Publicly verify employee code for student registration' })
  async verifyEmployeeCode(@Param('code') code: string) {
    const result = await this.employeeService.verifyEmployeeCode(code);
    return {
      message: result.valid ? 'Employee verified' : 'Invalid employee',
      data: result,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all employees with pagination & filtering (Admin only)' })
  async getAllEmployees(@Query() filters: EmployeeQueryDto) {
    const result = await this.employeeService.getAllEmployees(filters);
    return {
      message: 'Employees retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get employee details by ID (Admin only)' })
  async getEmployeeById(@Param('id') id: string) {
    const result = await this.employeeService.getEmployeeById(id);
    return {
      message: 'Employee details retrieved successfully',
      data: result,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new employee (Admin only)' })
  async createEmployee(
    @Body() dto: CreateEmployeeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.status(HttpStatus.CREATED);
    const result = await this.employeeService.createEmployee(dto);
    return {
      message: 'এমপ্লয়ি সফলভাবে তৈরি করা হয়েছে!',
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update employee details by ID (Admin only)' })
  async updateEmployee(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    const result = await this.employeeService.updateEmployee(id, dto);
    return {
      message: 'এমপ্লয়ি তথ্য আপডেট করা হয়েছে!',
      data: result,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete employee by ID (Admin only)' })
  async deleteEmployee(@Param('id') id: string) {
    const result = await this.employeeService.deleteEmployee(id);
    return {
      message: result.message,
      data: result,
    };
  }
}
