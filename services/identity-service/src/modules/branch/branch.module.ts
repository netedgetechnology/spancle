import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity }     from './entities/branch.entity';
import { BranchController } from './controllers/branch.controller';
import { BranchService }    from './services/branch.service';
import { BranchRepository } from './repositories/branch.repository';
import { UserModule }       from '../user/user.module';

/**
 * BranchModule — tenant branch management.
 *
 * Imports UserModule to access UserRepository for manager validation.
 * Registered in AppModule.imports alongside UserModule and TenantModule.
 */
@Module({
  imports:     [TypeOrmModule.forFeature([BranchEntity]), UserModule],
  controllers: [BranchController],
  providers:   [BranchService, BranchRepository],
  exports:     [BranchService],
})
export class BranchModule {}
