import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuEntity } from './entities/menu.entity';
import { MenuItemEntity } from './entities/menu-item.entity';
import { MenuController } from './controllers/menu.controller';
import { MenuService } from './services/menu.service';
import { MenuRepository } from './repositories/menu.repository';
import { MenuItemRepository } from './repositories/menu-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MenuEntity, MenuItemEntity])],
  controllers: [MenuController],
  providers: [MenuService, MenuRepository, MenuItemRepository],
  exports: [MenuService],
})
export class MenuModule {}
