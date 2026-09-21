import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserQueryDto, ToggleBlockDto } from './dto/user-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with search, filtering and pagination' })
  async getAllUsers(@Query() query: UserQueryDto) {
    const result = await this.userService.getAllUsers(query);
    return {
      message: 'Users retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('admin')
  @ApiOperation({ summary: 'Admin alias: Get all users' })
  async getAdminUsers(@Query() query: UserQueryDto) {
    const result = await this.userService.getAllUsers(query);
    return {
      message: 'Users retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'Admin alias: Get all users list' })
  async getAdminAllUsers(@Query() query: UserQueryDto) {
    const result = await this.userService.getAllUsers(query);
    return {
      message: 'Users retrieved successfully',
      meta: result.meta,
      data: result.data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single user by ID' })
  async getUserById(@Param('id') id: string) {
    const result = await this.userService.getUserById(id);
    return {
      message: 'User retrieved successfully',
      data: result,
    };
  }

  @Patch(':id/block-status')
  @ApiOperation({ summary: 'Toggle user block status' })
  async toggleBlockStatus(
    @Param('id') id: string,
    @Body() dto: ToggleBlockDto,
  ) {
    const result = await this.userService.toggleBlockStatus(id, dto.isBlocked);
    return {
      message: `User status updated to ${dto.isBlocked ? 'Blocked' : 'Active'}`,
      data: result,
    };
  }
}
