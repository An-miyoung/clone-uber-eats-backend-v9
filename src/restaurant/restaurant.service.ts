import { Injectable } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateRestaurantInput,
  CreateRestaurantOutput,
} from './dtos/create-restaurant.dto';
import { User } from 'src/users/entities/user.entity';
import { Category } from './entities/category.entity';
import {
  EditRestaurantInput,
  EditRestaurantOutput,
} from './dtos/edit-restaurant.dto';
import {
  DeleteRestaurantInput,
  DeleteRestaurantOutput,
} from './dtos/delete-restaurant.dto';
import { AllCategoriesOutput } from './dtos/all-categories.dto';
import { CategoryInput, CategoryOutput } from './dtos/category.dto';
import { RestaurantsInput, RestaurantsOutput } from './dtos/restaurants.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async getOrCreateCategory(categoryName: string) {
    const name = categoryName.trim().toLowerCase();
    const slug = name.replace(/ /g, '-');
    let category = await this.categories.findOneBy({ slug });
    if (!category) {
      category = await this.categories.save(
        this.categories.create({
          name,
          slug,
        }),
      );
    }
    return category;
  }

  async createRestaurant(
    owner: User,
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<CreateRestaurantOutput> {
    try {
      const newRestaurant = this.restaurants.create(createRestaurantInput);
      newRestaurant.owner = owner;
      newRestaurant.category = await this.getOrCreateCategory(
        createRestaurantInput.categoryName,
      );

      await this.restaurants.save(newRestaurant);
      return {
        ok: true,
        restaurantId: newRestaurant.id,
      };
    } catch (error) {
      return { ok: false, error: '새로운 레스토랑을 만들지 못했습니다.' };
    }
  }

  async editRestaurant(
    owner: User,
    editRestaurantInput: EditRestaurantInput,
  ): Promise<EditRestaurantOutput> {
    try {
      // 해당 restaurant 를 찾는다.
      // owner 가 맞는지 확인하기 위해 owner 의 Id 를 가져온다.
      // loadRelationIds: true,
      const restaurant = await this.restaurants.findOne({
        where: { id: editRestaurantInput.restaurantId },
      });
      if (!restaurant) {
        return {
          ok: false,
          error: '등록되지 않은 레스토랑입니다.',
        };
      }
      // owner 가 맞는 지 확인, restaurant entity 에서 @RelationId 를 선언해서 자동으로 들어온다.
      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: '레스토랑을 수정할 권한이 없습니다.',
        };
      }

      // 사용자가 카테고리를 입력값으로 주지 않으면 NULL 로 save 단계에서 category 는 pass
      let category: Category = null;
      if (editRestaurantInput.categoryName) {
        category = await this.getOrCreateCategory(
          editRestaurantInput.categoryName,
        );
      }
      await this.restaurants.save([
        {
          id: editRestaurantInput.restaurantId,
          ...editRestaurantInput,
          // 사용자가 카테고리를 수정하려한다면 getOrCreate 를 통해 찾거나 만들었을것이고, 그것을 카테고리 오브젝트를 리턴함.
          // { } 하나로 오브젝트와 리턴 모두 해결
          ...(category && { category: category }),
        },
      ]);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '레스토랑 계정수정에 실패했습니다.',
      };
    }
  }

  async deleteRestaurant(
    owner: User,
    { restaurantId }: DeleteRestaurantInput,
  ): Promise<DeleteRestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOneBy({ id: restaurantId });
      if (!restaurant) {
        return {
          ok: false,
          error: '존재하지 않는 레스토랑입니다.',
        };
      }
      if (restaurant.ownerId !== owner.id) {
        return {
          ok: false,
          error: '레스토랑을 삭제할 권한이 없습니다.',
        };
      }
      await this.restaurants.delete({ id: restaurantId });
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '레스토랑을 삭제하는데 실패했습니다.',
      };
    }
  }

  async allCategories(): Promise<AllCategoriesOutput> {
    try {
      const categories = await this.categories.find();
      if (categories.length === 0) {
        return {
          ok: false,
          error: '카테고리가 없습니다.',
        };
      }
      return {
        ok: true,
        categories,
      };
    } catch {
      return {
        ok: false,
        error: '모든 카테고리를 불러오는데 실패했습니다.',
      };
    }
  }

  // category 가 불릴때마다 restaurant reposiroty 를 돌며 숫자를 센다.
  async countRestaurant(category: Category): Promise<number> {
    try {
      return this.restaurants.count({
        where: { category: { id: category.id } },
      });
    } catch (error) {
      console.log(error.message);
      return null;
    }
  }

  async findCategoryBySlug({
    slug,
    page,
    itemsPerOnePage,
  }: CategoryInput): Promise<CategoryOutput> {
    try {
      const category = await this.categories.findOne({
        where: { slug },
        // category 와 restaurant 는 연결되어 있을뿐 category table 에 직접 있는 내용이 아니므로
        // relations: ['restaurants'],
        // 대신, pagination 을 사용
      });
      if (!category) {
        return {
          ok: false,
          error: '해당되는 카테고리가 없습니다.',
        };
      }
      const restaurants = await this.restaurants.find({
        where: { category: { id: category.id } },
        take: itemsPerOnePage,
        skip: (page - 1) * itemsPerOnePage,
      });
      category.restaurants = restaurants;
      const totalResult = await this.countRestaurant(category);

      return {
        ok: true,
        category,
        totalPages: Math.ceil(totalResult / itemsPerOnePage),
      };
    } catch {
      return {
        ok: false,
        error: '카테고리를 읽어오는데 실패했습니다.',
      };
    }
  }

  async allRestaurants({
    page,
    itemsPerOnePage,
  }: RestaurantsInput): Promise<RestaurantsOutput> {
    try {
      const [results, totalResults] = await this.restaurants.findAndCount({
        take: itemsPerOnePage,
        skip: (page - 1) * itemsPerOnePage,
      });
      return {
        ok: true,
        results,
        totalPages: Math.ceil(totalResults / itemsPerOnePage),
        totalResults,
      };
    } catch {
      return {
        ok: false,
        error: '레스토랑을 불러오는데 실패했습니다.',
      };
    }
  }
}
