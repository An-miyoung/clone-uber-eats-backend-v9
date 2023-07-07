import got from 'got';
// import FormData from 'form-data' 로 하는 경우, constructor 내부에서 sendEmail test 할때 에러
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_OPTIONS } from 'src/common/commom.constants';
import { EmailVars, MailModuleOptions } from './mail.interface';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  private async sendEmail(
    subject: string,
    // 메일 받을 대상을 바꾸고 싶다면
    //  to: string 으로 선언하고 form.append 에서 받아준다.
    template: string,
    emailVars: EmailVars[],
  ) {
    const form = new FormData();
    form.append(
      'from',
      `Mi0 from Nuber Eats <mailgun@${this.options.emailDomain}>`,
    );
    form.append('to', 'noonchicat@naver.com');
    form.append('subject', subject);
    form.append('template', template);
    emailVars.forEach((eVar) => form.append(`v:${eVar.key}`, eVar.value));

    try {
      // mail gun 의 내 domain에서 뭔가를 가져와야 하는데, axios 같은 기능을 하는 got 라이브러리 설치후 이요
      await got(
        `https://api.mailgun.net/v3/${this.options.emailDomain}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          body: form,
        },
      );
    } catch (error) {
      console.log(error);
    }
  }

  sendVerficationEmail(code: string, email: string, template: string) {
    this.sendEmail('Nuber Eats 계정확인', template, [
      { key: 'code', value: code },
      { key: 'username', value: email },
    ]);
  }
}
