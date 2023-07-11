import { Injectable } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { Raw, Repository } from 'typeorm';
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
import { RestaurantInput, RestaurantOutput } from './dtos/restaurant.dto';
import {
  SearchRestaurantInput,
  SearchRestaurantOutput,
} from './dtos/search-restaurant.dto';
import { CreateDishInput, CreateDishOutput } from './dtos/create-dish.dto';
import { Dish } from './entities/dish.entity';
import { DeleteDishInput, DeleteDishOutput } from './dtos/delete-dish.dto';
import { EditDishInput, EditDishOutput } from './dtos/edit-dish.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(Dish) private readonly dishes: Repository<Dish>,
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
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        take: itemsPerOnePage,
        skip: (page - 1) * itemsPerOnePage,
      });
      return {
        ok: true,
        restaurants,
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

  async findRestaurantById({
    restaurantId,
  }: RestaurantInput): Promise<RestaurantOutput> {
    try {
      const restaurant = await this.restaurants.findOne({
        where: { id: restaurantId },
        // menu 는 restaurant table 에 있는 내용이 아니라 Dish table 내용을 연결해놓은 것뿐이기에
        // 불러오고 싶다면 ralations 로 연결해줘야 한다.
        relations: ['menu'],
      });
      if (!restaurant) {
        return {
          ok: false,
          error: '해당 레스토랑이 존재하지 않습니다.',
        };
      }
      return {
        ok: true,
        restaurant,
      };
    } catch {
      return {
        ok: false,
        error: '해당 레스토랑을 찾는데 실패했습니다.',
      };
    }
  }

  async searchRestaurantByName({
    query,
    page,
    itemsPerOnePage,
  }: SearchRestaurantInput): Promise<SearchRestaurantOutput> {
    try {
      const [restaurants, totalResults] = await this.restaurants.findAndCount({
        where: {
          // querty 가 검색에 어디에 있는 찾는 Like(% %) 사용
          // name: Like(`%${query}%`),
          // Like 를 사용하면 대소문자를 구별해서 직접 sql 문을 만든다
          name: Raw((name) => `${name} ILike '%${query}%'`),
        },
        take: itemsPerOnePage,
        skip: (page - 1) * itemsPerOnePage,
      });
      if (restaurants.length === 0) {
        return {
          ok: false,
          error: '해당 레스토랑이 존재하지 않습니다.',
        };
      }
      return {
        ok: true,
        restaurants,
        totalResults,
        totalPages: Math.ceil(totalResults / itemsPerOnePage),
      };
    } catch {
      return {
        ok: false,
        error: '해당 레스토랑을 찾는데 실패했습니다.',
      };
    }
  }

  async createDish(
    owner: User,
    createDishInput: CreateDishInput,
  ): Promise<CreateDishOutput> {
    try {
      const restaurant = await this.restaurants.findOneBy({
        id: createDishInput.restaurantId,
      });
      if (!restaurant) {
        return {
          ok: false,
          error: '해당 레스토랑이 존재하지 않습니다.',
        };
      }
      if (owner.id !== restaurant.ownerId) {
        return {
          ok: false,
          error: '메뉴를 생성할 권한이 없습니다.',
        };
      }

      // 인자로 restaurantId 를 줘도 dishes.create 에서 직접 연결해 가져가지 않는다.
      // const dish = this.dishes.create(createDishInput);
      // dish['restaurantId'] = createDishInput.restaurantId;
      // 이런 형태로 { ...createDishInput, restaurant } 넣어줘야 한다.
      await this.dishes.save(
        this.dishes.create({ ...createDishInput, restaurant }),
      );

      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '메뉴생성에 실패했습니다.',
      };
    }
  }

  async editDish(
    owner: User,
    editDishInput: EditDishInput,
  ): Promise<EditDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: editDishInput.dishId },
        relations: ['restaurant'],
      });
      if (!dish) {
        return {
          ok: false,
          error: '해당 메뉴가 존재하지 않습니다.',
        };
      }
      if (owner.id !== dish.restaurant.ownerId) {
        return {
          ok: false,
          error: '메뉴를 수정할 권한이 없습니다.',
        };
      }
      await this.dishes.save([
        {
          id: editDishInput.dishId,
          ...editDishInput,
        },
      ]);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '메뉴수정에 실패했습니다.',
      };
    }
  }

  async deleteDish(
    owner: User,
    { dishId }: DeleteDishInput,
  ): Promise<DeleteDishOutput> {
    try {
      const dish = await this.dishes.findOne({
        where: { id: dishId },
        relations: ['restaurant'],
      });
      if (!dish) {
        return {
          ok: false,
          error: '해당 메뉴가 존재하지 않습니다.',
        };
      }
      if (owner.id !== dish.restaurant.ownerId) {
        return {
          ok: false,
          error: '메뉴를 삭제할 권한이 없습니다.',
        };
      }
      await this.dishes.delete(dishId);
      return {
        ok: true,
      };
    } catch {
      return {
        ok: false,
        error: '메뉴삭제에 실패했습니다.',
      };
    }
  }
}
