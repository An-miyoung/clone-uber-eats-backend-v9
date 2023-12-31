import { Field, InputType, ObjectType, PartialType } from '@nestjs/graphql';
import { CreateDishInput } from './create-dish.dto';
import { CoreOutput } from 'src/common/dtos/output.dto';

@InputType()
export class EditDishInput extends PartialType(CreateDishInput) {
  @Field((type) => Number)
  dishId: number;
}

@ObjectType()
export class EditDishOutput extends CoreOutput {}
