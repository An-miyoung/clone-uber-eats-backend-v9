import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AllowedRoles } from './role.decorator';
import { JwtService } from 'src/jwt/jwt.service';
import { UsersService } from 'src/users/users.service';

// 요청받은 request 를 통과시킬것이지 블로킹할 것인지를 결정해주는 Guard class
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // metadata 중 roles 라고 쓴 데이터를 읽어온다.
    const roles = this.reflector.get<AllowedRoles>(
      'roles',
      context.getHandler(),
    );
    // createAccount, login 같은 public endpoint 대응
    if (!roles) {
      return true;
    }

    // guard class 는 graphql 의 class 이기때문에, http 의 ExecutionContext 는 읽을수 없어서
    // grappql 에서 읽을 수 있는 gqlContext 로 변환해준다.
    // 변환시켜도 req 에 넣어줬던 token 은 같은 이름으로 변화돼 사용가능
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const token = gqlContext['token'];
    if (token) {
      const decoded = this.jwtService.verify(token.toString());
      if (decoded) {
        if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
          const user = await this.userService.findById(decoded['id']);
          if (!user) {
            return false;
          }
          // token이 갖고 user를 찾아서 gqlContext에 쑤셔넣어준다.
          gqlContext['user'] = user;

          // metadata 가 있다면 context 에 user 가 필요한 endpoint 대응
          if (roles.includes('Any')) {
            return true;
          }
          // roles 는 array, user.role 은 string 이기 때문에 if 문으로 직접비교하기 복잡해서
          return roles.includes(user.role);
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  }
}
