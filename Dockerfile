#
# 🧑‍💻 Development
#
FROM node:20-alpine as dev
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV development

COPY --chown=node:node . .

# RUN npm ci
RUN yarn --frozen-lockfile

USER node

#
# 🏡 Production Build
#
FROM node:20-alpine as builder

WORKDIR /app
RUN apk add --no-cache libc6-compat

ENV NODE_ENV production

COPY --chown=node:node --from=dev /app/node_modules ./node_modules
COPY --chown=node:node . .

# RUN npx prisma generate \
# && npm run build \
# && npm prune --omit=dev

RUN yarn build
RUN yarn --frozen-lockfile --production && yarn cache clean

#
# 🚀 Production Server
#
FROM node:20-alpine

ENV NODE_ENV production

WORKDIR /app
RUN apk add --no-cache libc6-compat

ENV NODE_ENV production

COPY --from=builder --chown=node:node /home/node/package*.json ./
COPY --chown=node:node --from=build /app/dist dist
COPY --chown=node:node --from=build /app/node_modules node_modules

EXPOSE 3000

CMD ["node", "dist/main.js"]
