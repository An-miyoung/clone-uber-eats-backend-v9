import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from './output.dto';

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 25 })
  // 한 페이지당 몇개의 item을 보여줄 것인지
  itemsPerOnePage: number;
  @Field(() => Int, { defaultValue: 1 })
  // 사용자가 보고 싶은 페이지넘버, 총10페이지중 2번째페이지
  page: number;
}

@ObjectType()
export class PaginationOutput extends CoreOutput {
  @Field(() => Int, { nullable: true })
  totalPages?: number;

  @Field(() => Int, { nullable: true })
  totalResults?: number;
}
