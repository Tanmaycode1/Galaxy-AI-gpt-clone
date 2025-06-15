import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create account
          </h1>
          <p className="text-muted-foreground">
            Sign up to get started with Galaxy AI
          </p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'btn-chatgpt',
              card: 'shadow-lg',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          redirectUrl="/chat"
        />
      </div>
    </div>
  );
} 