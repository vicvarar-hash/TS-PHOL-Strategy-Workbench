# Stage 1: Build the React Application
FROM node:22-alpine as builder

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install dependencies (using clean install for reproducibility)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
# Note: GEMINI_API_KEY must be passed as an ARG and set as ENV to be baked into the Vite build
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy bespoke nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Vite output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (Cloud Run defaults to 8080 or listens to PORT env var, but nginx defaults to 80)
# Cloud Run intelligently maps standard ports 80/8080 automatically.
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
