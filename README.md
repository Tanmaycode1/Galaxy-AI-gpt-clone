# 🚀 ChatGPT Clone - AI Chat Application

A pixel-perfect ChatGPT clone built with modern web technologies, featuring multiple AI providers, vision capabilities, and advanced chat management.

![ChatGPT Clone](https://img.shields.io/badge/ChatGPT-Clone-10a37f?style=for-the-badge&logo=openai&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## ✨ Features

### 🤖 AI Capabilities
- **Multiple AI Providers**: OpenAI (GPT-4 Turbo, GPT-4, GPT-3.5) & Anthropic (Claude 3 Opus, Sonnet, Haiku)
- **Vision Support**: Upload and analyze images with vision-enabled models
- **Streaming Responses**: Real-time AI responses with smooth typing animation
- **Model Switching**: Dynamic model selection with capability indicators

### 💬 Chat Features
- **Message Editing**: Edit and regenerate AI responses
- **Message Deletion**: Remove unwanted messages with confirmation
- **File Attachments**: Support for images, PDFs, and text files
- **Chat History**: Persistent chat sessions with search and organization
- **Chat Management**: Archive, rename, and delete conversations

### 🎨 User Interface
- **Pixel-Perfect Design**: Authentic ChatGPT-inspired interface
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Theme Support**: Light, dark, and system theme modes
- **Glass Morphism**: Modern UI effects with backdrop blur
- **Smooth Animations**: Micro-interactions and transitions

### 🔐 Authentication & Data
- **Clerk Authentication**: Secure user management with multiple providers
- **Demo Mode**: Try the app without signing up
- **MongoDB Storage**: Persistent chat history and user data
- **Cloudinary Integration**: Optimized file uploads and storage

## 🛠️ Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **ShadCN/UI**: Beautiful, accessible UI components
- **Lucide Icons**: Modern icon library

### Backend
- **Vercel AI SDK**: Streaming AI responses
- **MongoDB**: NoSQL database for chat storage
- **Mongoose**: MongoDB object modeling
- **Cloudinary**: Media management and optimization

### AI & Authentication
- **OpenAI API**: GPT models and vision capabilities
- **Anthropic API**: Claude models with vision
- **Clerk**: Authentication and user management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB database (Atlas or local)
- Cloudinary account
- API keys for OpenAI and Anthropic
- Clerk application setup

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/chatgpt-clone.git
   cd chatgpt-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat

   # Database
   MONGODB_URI=your_mongodb_connection_string

   # AI Providers
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # File Storage
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── chat/          # Chat streaming endpoint
│   │   ├── chats/         # Chat CRUD operations
│   │   └── upload/        # File upload handling
│   ├── chat/              # Chat interface page
│   ├── sign-in/           # Authentication pages
│   └── sign-up/
├── components/            # React components
│   ├── chat/              # Chat-specific components
│   ├── features/          # Feature showcases
│   ├── layout/            # Layout components
│   ├── providers/         # Context providers
│   └── ui/                # Reusable UI components
├── lib/                   # Utilities and configurations
│   ├── models/            # Database models
│   ├── ai.ts              # AI configuration
│   ├── db.ts              # Database connection
│   └── models.ts          # Model definitions
└── config/
    └── models.yaml        # AI model configurations
```

## 🎯 Usage

### Basic Chat
1. **Start a conversation**: Type a message and press Enter
2. **Model selection**: Choose from available AI models
3. **File uploads**: Attach images for vision-enabled models
4. **Stream responses**: Watch AI responses appear in real-time

### Advanced Features
- **Edit messages**: Hover over messages to see edit/delete options
- **Regenerate responses**: Edit user messages to get new AI responses
- **Chat management**: Use the sidebar to organize conversations
- **Search chats**: Find specific conversations with the search bar
- **Archive chats**: Keep your sidebar organized

### Keyboard Shortcuts
- `Enter`: Send message
- `Shift + Enter`: New line in message
- `Esc`: Cancel editing
- `/`: Focus search (when in sidebar)

## 🔧 Configuration

### Model Configuration
Edit `config/models.yaml` to customize available AI models:

```yaml
models:
  openai:
    gpt-4-turbo:
      name: "GPT-4 Turbo"
      provider: "openai"
      model_id: "gpt-4-turbo-preview"
      image: true  # Enable file uploads
      max_tokens: 4096
      context_window: 128000
      pricing:
        input: 0.01
        output: 0.03
      description: "Most capable GPT-4 model with vision"
```

### Theme Customization
Themes are managed through Tailwind CSS variables in `globals.css`. Customize colors, spacing, and animations to match your brand.

## 🚀 Deployment

### Vercel (Recommended)
1. **Connect your repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy** automatically on push to main branch

### Docker
```bash
# Build the image
docker build -t chatgpt-clone .

# Run the container
docker run -p 3000:3000 --env-file .env.local chatgpt-clone
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI](https://openai.com/) for the GPT models
- [Anthropic](https://anthropic.com/) for the Claude models
- [Vercel](https://vercel.com/) for the AI SDK and deployment platform
- [Clerk](https://clerk.dev/) for authentication services
- [ShadCN](https://ui.shadcn.com/) for the beautiful UI components

## 📧 Support

For support, please open an issue on GitHub or contact [your-email@example.com](mailto:your-email@example.com).

---

**Built with ❤️ by [Your Name]**

*This project is not affiliated with OpenAI or ChatGPT. It's an independent implementation for educational and demonstration purposes.* 