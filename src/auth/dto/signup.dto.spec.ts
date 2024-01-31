import { validate } from 'class-validator';
import { SignUpDto } from './signup.dto';

describe('SignUpDto', () => {
  it('should pass validation with valid data', async () => {
    const signUpDto = new SignUpDto();
    signUpDto.email = 'test@mail.com';
    signUpDto.password = 'Password123!';
    signUpDto.fullName = 'Test User';

    const errors = await validate(signUpDto);

    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid email', async () => {
    const signUpDto = new SignUpDto();
    signUpDto.email = 'invalid-email';
    signUpDto.password = 'Password123!';
    signUpDto.fullName = 'Test User';

    const errors = await validate(signUpDto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty(
      'isEmail',
      'email must be an email',
    );
  });

  it('should fail validation with weak password', async () => {
    const signUpDto = new SignUpDto();
    signUpDto.email = 'test@mail.com';
    signUpDto.password = 'weakpassword';
    signUpDto.fullName = 'Test User';

    const errors = await validate(signUpDto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty(
      'isStrongPassword',
      'password is not strong enough',
    );
  });

  it('should fail validation with empty full name', async () => {
    const signUpDto = new SignUpDto();
    signUpDto.email = 'test@mail.com';
    signUpDto.password = 'Password123!';
    signUpDto.fullName = '';

    const errors = await validate(signUpDto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty(
      'isNotEmpty',
      'fullName should not be empty',
    );
  });
});
