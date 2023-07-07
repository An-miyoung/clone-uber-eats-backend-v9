import { DynamicModule, Global, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { JwtModuleOptions } from './jwt.interface';
import { CONFIG_OPTIONS } from '../common/commom.constants';

@Module({})
// jwtService 를 부르고 싶은 모듈 useModule 에서 imports array 에 JwtService 를 넣으면
// @Injectable 이 붙은 class 는 imports array 에 못넣는다는 에러
// JwtService 를 지우면 dependency 를 넣어달라는 에러가 나옴
// JwtModule 를 @Global() 로 선언하면 자동 import 가 되므로 문제해결
@Global()
export class JwtModule {
  static forRoot(options: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [
        {
          // config 로 부터 받아온 privatKey 를 service 에 넘겨야 jwt token 을 생성할 수 있으므로
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        JwtService,
      ],
    };
  }
}
