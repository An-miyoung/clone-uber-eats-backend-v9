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
}
