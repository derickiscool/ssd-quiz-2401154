FROM node:alpine

RUN apk add --no-cache tini git \
    && npm install -g git-http-server \
    && adduser -D -g git git

USER git
WORKDIR /home/git

RUN git init --bare repository.git \
    && git config --global user.name "dericleechengzhang" \
    && git config --global user.email "2401154@sit.singaporetech.edu.sg"

ENTRYPOINT ["tini", "--", "git-http-server", "-p", "3000", "/home/git"]
