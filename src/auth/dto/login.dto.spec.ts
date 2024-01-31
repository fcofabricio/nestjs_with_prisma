import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('should pass validation with valid data', async () => {
    const signUpDto = new LoginDto();
    signUpDto.email = 'test@mail.com';
    signUpDto.password = 'Password123!';

    const errors = await validate(signUpDto);

    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid email', async () => {
    const signUpDto = new LoginDto();
    signUpDto.email = 'invalid-email';
    signUpDto.password = 'Password123!';

    const errors = await validate(signUpDto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty(
      'isEmail',
      'email must be an email',
    );
  });

  it('should fail validation with weak password', async () => {
    const signUpDto = new LoginDto();
    signUpDto.email = 'test@mail.com';
    signUpDto.password = '';

    const errors = await validate(signUpDto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty(
      'isNotEmpty',
      'password should not be empty',
    );
  });
});
