import { EntityRepository, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@EntityRepository()
export class CategoryRepository extends Repository<Category> {
  async getOrCreate(categoryName: string): Promise<Category> {
    const name = categoryName.trim().toLowerCase();
    const slug = name.replace(/ /g, '-');
    let category = await this.findOneBy({ slug });
    if (!category) {
      category = await this.save(
        this.create({
          name,
          slug,
        }),
      );
    }
    console.log('함수내', category);
    return category;
  }
}
