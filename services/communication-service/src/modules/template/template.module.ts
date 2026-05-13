import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateController } from './controllers/template.controller';
import { TemplateService } from './services/template.service';
import { TemplateRepository } from './repositories/template.repository';
import { TemplateEntity } from './entities/template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateEntity])],
  controllers: [TemplateController],
  providers: [TemplateService, TemplateRepository],
  exports: [TemplateService],
})
export class TemplateModule {}
