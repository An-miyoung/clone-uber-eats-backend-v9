import { Injectable } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRestaurantInput } from './dtos/create-restaurant.dto';
import {
  EditRestaurantInput,
  UpdateRestaurantDto,
} from './dtos/edit-restaurant.dto';

@Injectable()
export class RestaurantService {
  // 코드내부에서
  // const restaurants = connection.getRepository(Restaurant)
  // 를 써서 연결해야 하지만, constructor 내부에서 @InjectableRepository decorator 사용
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
  ) {}

  async getAll(): Promise<Restaurant[]> {
    return await this.restaurants.find();
  }

  async createRestaurant(
    createRestaurantInput: CreateRestaurantInput,
  ): Promise<boolean> {
    try {
      // create 는 DB 에 저장하지않고 instance 만 생성한다.
      const newRestaurant = await this.restaurants.create(
        createRestaurantInput,
      );
      // save 를 불러야 DB 에 저장
      this.restaurants.save(newRestaurant);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async editRestaurant({ id, data }: UpdateRestaurantDto): Promise<boolean> {
    try {
      await this.restaurants.update(id, { ...data });
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
