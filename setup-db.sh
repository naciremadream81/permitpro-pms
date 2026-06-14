#!/bin/bash

# ============================================================================
# Database Setup Script for Permit Processing & Document Management System
# ============================================================================
# 
# This script automates the complete database setup process from start to finish:
# 1. Checks prerequisites (Node.js, npm)
# 2. Installs dependencies
# 3. Sets up environment variables (.env file)
# 4. Runs Prisma migrations
# 5. Generates Prisma Client
# 6. Seeds the database with sample data
# 7. Creates storage directory
#
# Usage: ./setup-db.sh
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============================================================================
# Step 1: Check Prerequisites
# ============================================================================

print_header "Step 1: Checking Prerequisites"

# Check Node.js
print_step "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed: $NODE_VERSION"
    
    # Check if version is 18 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required. Found: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
print_step "Checking npm installation..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm is installed: $NPM_VERSION"
else
    print_error "npm is not installed. Please install npm."
    exit 1
fi

# ============================================================================
# Step 2: Install Dependencies
# ============================================================================

print_header "Step 2: Installing Dependencies"

print_step "Installing npm packages..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# ============================================================================
# Step 3: Set Up Environment Variables
# ============================================================================

print_header "Step 3: Setting Up Environment Variables"

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    print_warning ".env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_step "Keeping existing .env file"
        SKIP_ENV=true
    else
        print_step "Backing up existing .env to .env.backup"
        cp "$ENV_FILE" "${ENV_FILE}.backup"
    fi
fi

if [ "$SKIP_ENV" != true ]; then
    print_step "Creating .env file..."
    
    # Generate NEXTAUTH_SECRET if openssl is available
    if command -v openssl &> /dev/null; then
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        print_success "Generated NEXTAUTH_SECRET"
    else
        print_warning "openssl not found. Using a default secret (not secure for production!)"
        NEXTAUTH_SECRET="change-this-secret-in-production-$(date +%s)"
    fi
    
    # Get the port from user or use default
    read -p "Enter the port for the development server (default: 3000): " PORT
    PORT=${PORT:-3000}
    
    # Create .env file
    cat > "$ENV_FILE" << EOF
# Database
# SQLite database file (for development)
# For production, use PostgreSQL: postgresql://user:password@localhost:5432/permitdb
DATABASE_URL="file:./dev.db"

# NextAuth Configuration
# URL where your application is accessible
NEXTAUTH_URL="http://localhost:${PORT}"
# Secret key for JWT encryption (generated automatically)
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# File Storage
# Directory where uploaded files will be stored
# Default: ./storage
STORAGE_ROOT="./storage"
EOF
    
    print_success ".env file created successfully"
    print_warning "Remember to update NEXTAUTH_SECRET for production!"
fi

# ============================================================================
# Step 4: Set Up Database with Prisma
# ============================================================================

print_header "Step 4: Setting Up Database"

# Run Prisma migrations
print_step "Running Prisma migrations..."
if npx prisma migrate dev --name init; then
    print_success "Database migrations completed"
else
    print_error "Failed to run migrations"
    exit 1
fi

# Generate Prisma Client
print_step "Generating Prisma Client..."
if npx prisma generate; then
    print_success "Prisma Client generated successfully"
else
    print_error "Failed to generate Prisma Client"
    exit 1
fi

# ============================================================================
# Step 5: Seed the Database
# ============================================================================

print_header "Step 5: Seeding Database"

print_step "Seeding database with sample data..."
read -p "Do you want to seed the database with sample data? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    if npm run db:seed; then
        print_success "Database seeded successfully"
        echo ""
        echo -e "${GREEN}Sample login credentials:${NC}"
        echo -e "  ${BLUE}Admin:${NC} admin@permitco.com / admin123"
        echo -e "  ${BLUE}User:${NC}  user@permitco.com / user123"
    else
        print_error "Failed to seed database"
        exit 1
    fi
else
    print_warning "Skipping database seed"
fi

# ============================================================================
# Step 6: Create Storage Directory
# ============================================================================

print_header "Step 6: Setting Up File Storage"

STORAGE_DIR="./storage"
if [ ! -d "$STORAGE_DIR" ]; then
    print_step "Creating storage directory..."
    mkdir -p "$STORAGE_DIR"
    print_success "Storage directory created: $STORAGE_DIR"
else
    print_success "Storage directory already exists: $STORAGE_DIR"
fi

# ============================================================================
# Step 7: Verification
# ============================================================================

print_header "Step 7: Verification"

print_step "Verifying database setup..."

# Check if database file exists (for SQLite)
if [ -f "dev.db" ]; then
    print_success "Database file created: dev.db"
else
    print_warning "Database file not found (this is normal if using PostgreSQL)"
fi

# Check Prisma Client
if [ -d "node_modules/.prisma/client" ] || [ -d "node_modules/@prisma/client" ]; then
    print_success "Prisma Client is available"
else
    print_error "Prisma Client not found. Try running: npx prisma generate"
    exit 1
fi

# ============================================================================
# Summary
# ============================================================================

print_header "Setup Complete! 🎉"

echo -e "${GREEN}Your database has been set up successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Start the development server:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo ""
echo "  2. Open your browser and navigate to:"
echo -e "     ${YELLOW}http://localhost:${PORT}${NC}"
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "  3. Login with the sample credentials shown above"
fi
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  • View database in Prisma Studio: ${YELLOW}npx prisma studio${NC}"
echo "  • Reset database: ${YELLOW}npm run db:reset${NC}"
echo "  • Run migrations: ${YELLOW}npx prisma migrate dev${NC}"
echo "  • Generate Prisma Client: ${YELLOW}npx prisma generate${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""

