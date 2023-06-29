import { InputType, Field } from '@nestjs/graphql';
import { IsString, Length } from 'class-validator';

@InputType()
export class createRestaurantDto {
  @Field(() => String)
  @IsString()
  @Length(5, 15)
  name: string;

  @Field(() => String)
  @IsString()
  address: string;

  @Field(() => String)
  @IsString()
  owner: string;
}
