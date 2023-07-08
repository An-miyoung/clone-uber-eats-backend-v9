import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto';
import { LoginInput, LoginOutput } from './dtos/login.dto';
import { AuthUser } from 'src/auth/auth-user.decorator';
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto';
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto';
import { VerifyEmailInput, VerifyEmailOutput } from './dtos/verify-email.dto';
import { Role } from 'src/auth/role.decorator';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private readonly userService: UsersService) {}

  @Mutation(() => CreateAccountOutput)
  createAccount(
    @Args('input') createAccountInput: CreateAccountInput,
  ): Promise<CreateAccountOutput> {
    return this.userService.createAccount(createAccountInput);
  }

  @Mutation(() => LoginOutput)
  login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    return this.userService.login(loginInput);
  }

  // middleware 를 통해 http req 에 넣어준 context를
  // 모든 resolver에서 @Context 를 이용해 가져올수 있다.
  // me(@Context() context) + 컨텍스트에 token 이 있는지 조사하는 if 문
  // 그러나 nest 에서 제공하는 guard class 를 이용해 context 에서 가져온 내용을 판단해 true/falsa 리턴
  // @UseGuard(AuthGuard)
  // 한단계 더 진화해 app module 에서 APP_GUARD 를 선언해서 AuthGuard를 부를 수 있음.
  //  @Role 이라는 커스텀데코레이터를 만들어
  // token이 있는지와 role 이 무엇인지 까지 체크
  @Query(() => User)
  @Role(['Any'])
  me(@AuthUser() user: User) {
    return user;
  }

  @Query(() => UserProfileOutput)
  @Role(['Any'])
  userProfile(
    @Args('input') userProfileInput: UserProfileInput,
  ): Promise<UserProfileOutput> {
    return this.userService.userProfile(userProfileInput);
  }

  @Mutation(() => EditProfileOutput)
  @Role(['Any'])
  editProfile(
    @AuthUser() user: User,
    @Args('input') editProfileInput: EditProfileInput,
  ): Promise<EditProfileOutput> {
    return this.userService.editProfile(user.id, editProfileInput);
  }

  @Mutation(() => VerifyEmailOutput)
  verifyEmail(
    @Args('input') verifyEmailInput: VerifyEmailInput,
  ): Promise<VerifyEmailOutput> {
    return this.userService.verifyEmail(verifyEmailInput);
  }
}
