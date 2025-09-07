# Multi-PDF Chat Application Setup Guide

This application allows users to upload multiple PDFs, store them in Supabase, and chat with them. It includes a complete backend with document management and a modern frontend interface.

## Features

- ✅ **Authentication Required**: Landing page with sign-up/sign-in flow
- ✅ **Multiple PDF Upload**: Upload multiple PDFs with progress indicators
- ✅ **Supabase Integration**: Storage and database for PDFs and chats
- ✅ **Document Management**: List, view, delete uploaded documents
- ✅ **Multi-Chat System**: Users can have multiple separate chats
- ✅ **Real-time Status**: Upload progress and processing status tracking
- ✅ **Secure Access**: Signed URLs for PDF viewing and RLS for data isolation
- ✅ **Modern UI**: Responsive design with dark mode support
- ✅ **User Isolation**: Each user can only access their own documents and chats

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Clerk account for authentication

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### 2. Supabase Setup

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)

2. **Run the database setup script**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase-setup.sql`
   - Execute the script to create the documents table and storage policies

3. **Enable Row Level Security (RLS)**:
   - The script automatically enables RLS and creates appropriate policies
   - This ensures users can only access their own documents

4. **Create storage bucket**:
   - The script creates a `pdfs` bucket for storing PDF files
   - Storage policies are automatically configured

### 3. Clerk Authentication Setup

1. **Create a Clerk account** at [clerk.com](https://clerk.com)

2. **Create a new application**:
   - Choose "Next.js" as your framework
   - Copy the publishable key and secret key to your `.env.local` file

3. **Configure authentication**:
   - Enable email/password or social logins as needed
   - The app uses Clerk's user ID as the `user_id` in the documents table

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Upload PDFs
- **POST** `/api/upload`
- **Body**: FormData with `files` field (multiple PDF files)
- **Response**: Upload results with success/failure status

### Document Management
- **GET** `/api/documents` - List user's documents
- **DELETE** `/api/documents?id={id}` - Delete a document
- **GET** `/api/documents/{id}` - Get specific document
- **PATCH** `/api/documents/{id}` - Update document status
- **GET** `/api/documents/{id}/view` - Get signed URL for PDF viewing

### Chat Management
- **GET** `/api/chats` - List user's chats
- **POST** `/api/chats` - Create a new chat
- **DELETE** `/api/chats?id={id}` - Delete a chat
- **GET** `/api/chats/{id}` - Get specific chat with messages
- **PATCH** `/api/chats/{id}` - Update chat title or documents

### Message Management
- **GET** `/api/chats/{id}/messages` - Get messages for a chat
- **POST** `/api/chats/{id}/messages` - Add a message to a chat

## Database Schema

### Documents Table
- `id`: UUID primary key
- `user_id`: Clerk user ID (text)
- `title`: Document title (text)
- `storage_path`: Supabase storage path (text)
- `bytes`: File size in bytes (bigint)
- `page_count`: Number of pages (int, optional)
- `status`: Processing status (text: 'processing', 'ready', 'failed')
- `created_at`: Timestamp

### Chats Table
- `id`: UUID primary key
- `user_id`: Clerk user ID (text)
- `title`: Chat title (text)
- `document_ids`: Array of document UUIDs in this chat
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Messages Table
- `id`: UUID primary key
- `chat_id`: Foreign key to chats table
- `user_id`: Clerk user ID (text)
- `content`: Message content (text)
- `is_user`: Boolean (true for user messages, false for AI responses)
- `created_at`: Timestamp

## File Structure

```
├── app/
│   ├── api/
│   │   ├── upload/route.tsx          # PDF upload endpoint
│   │   └── documents/
│   │       ├── route.tsx             # Document management
│   │       └── [id]/
│   │           ├── route.tsx         # Get/update specific document
│   │           └── view/route.tsx    # Get signed URL for viewing
│   ├── layout.tsx
│   └── page.tsx                      # Main application page
├── components/
│   ├── DocumentList.tsx              # Document management interface
│   ├── PdfFilePicker.tsx             # File upload component
│   ├── PdfViewer.tsx                 # PDF viewing component
│   └── ui/button.tsx                 # UI components
├── lib/
│   └── supabaseAdmin.tsx             # Supabase admin client
└── supabase-setup.sql                # Database setup script
```

## Usage

### For Unauthenticated Users
1. **Landing Page**: View features and benefits of the application
2. **Sign Up/Sign In**: Click "Get Started" to create an account or "Sign In" to access existing account

### For Authenticated Users
1. **Dashboard**: Access your personal dashboard with documents and chats
2. **Upload PDFs**: Click "Upload PDFs" to select and upload multiple PDF files
3. **Manage Documents**: View, delete, and organize your uploaded PDFs
4. **Create Chats**: Start new conversations with your documents
5. **Multiple Chats**: Each user can have multiple separate chat sessions
6. **Secure Access**: All data is isolated per user - you can only see your own content

## Security Features

- **Row Level Security**: Users can only access their own documents
- **Signed URLs**: PDFs are accessed via time-limited signed URLs
- **File Validation**: Only PDF files are accepted for upload
- **Authentication**: All endpoints require valid Clerk authentication

## Troubleshooting

### Common Issues

1. **Upload fails**: Check Supabase storage bucket configuration and RLS policies
2. **PDFs not loading**: Verify signed URL generation and storage permissions
3. **Authentication errors**: Ensure Clerk keys are correctly configured
4. **Database errors**: Run the `supabase-setup.sql` script to ensure proper table setup

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```env
NODE_ENV=development
```

## Next Steps

- Implement AI chat functionality with the uploaded PDFs
- Add PDF text extraction and indexing
- Implement document search capabilities
- Add batch operations for document management
- Implement document sharing features

## Support

For issues or questions:
1. Check the console for error messages
2. Verify all environment variables are set correctly
3. Ensure Supabase and Clerk are properly configured
4. Check the network tab for API call failures
