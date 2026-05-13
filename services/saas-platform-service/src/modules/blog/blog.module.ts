import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogPostEntity } from './entities/blog-post.entity';
import { BlogCategoryEntity } from './entities/blog-category.entity';
import { BlogController } from './controllers/blog.controller';
import { BlogService } from './services/blog.service';
import { BlogPostRepository } from './repositories/blog-post.repository';
import { BlogCategoryRepository } from './repositories/blog-category.repository';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPostEntity, BlogCategoryEntity])],
  controllers: [BlogController],
  providers: [BlogService, BlogPostRepository, BlogCategoryRepository],
  exports: [BlogService],
})
export class BlogModule {}
