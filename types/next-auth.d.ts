/* eslint-disable @typescript-eslint/no-unused-vars */
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            role: "ADMIN" | "EMPLOYEE"
            avatar?: string | null
            mustChangePassword?: boolean
        } & DefaultSession["user"]
    }

    interface User extends DefaultUser {
        role: "ADMIN" | "EMPLOYEE"
        avatar?: string | null
        mustChangePassword?: boolean
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: "ADMIN" | "EMPLOYEE"
        avatar?: string | null
        mustChangePassword?: boolean
        accessToken?: string
        refreshToken?: string
        expiresAt?: number
    }
}
