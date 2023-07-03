import { ArgsType, Field, InputType, PartialType } from '@nestjs/graphql';
import { CreateRestaurantInput } from './create-restaurant.dto';
import { IsNumber } from 'class-validator';

@InputType()
// partialType 을 사용하면 일일이 field 를 지정해 주지 않아도
// CreateRestaurantInput 내용중 들어오는 것을 받는다.
export class EditRestaurantInput extends PartialType(CreateRestaurantInput) {}

@InputType()
export class UpdateRestaurantDto {
  @Field(() => Number)
  @IsNumber()
  id: number;

  @Field(() => EditRestaurantInput)
  data: EditRestaurantInput;
}
