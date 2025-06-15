import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground">
            Sign in to continue to Galaxy AI
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'btn-chatgpt',
              card: 'shadow-lg',
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/chat"
        />
      </div>
    </div>
  );
} 