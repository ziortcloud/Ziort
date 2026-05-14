import { z } from 'zod'

export const RegisterSchema = z.object({
  display_name:      z.string().min(2).max(100),
  email:             z.string().email(),
  password:          z.string().min(8).max(72),
  country_code:      z.string().length(2).default('IN'),
  preferred_lang:    z.string().default('en'),
})

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const OtpSendSchema = z.object({
  mobile:            z.string().min(10).max(15),
  country_dial_code: z.string().default('+91'),
})

export const OtpVerifySchema = z.object({
  mobile:            z.string().min(10).max(15),
  country_dial_code: z.string().default('+91'),
  otp:               z.string().length(6),
})

export type RegisterInput  = z.infer<typeof RegisterSchema>
export type LoginInput     = z.infer<typeof LoginSchema>
export type OtpSendInput   = z.infer<typeof OtpSendSchema>
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>
