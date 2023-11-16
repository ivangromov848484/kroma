FROM --platform=$BUILDPLATFORM golang:1.21.1-alpine3.18 as builder
RUN apk add --no-cache gcc git make musl-dev

COPY ./go.mod /app/go.mod
COPY ./go.sum /app/go.sum
COPY ./Makefile /app/Makefile

COPY ./op-node /app/op-node
COPY ./op-chain-ops /app/op-chain-ops
COPY ./op-service /app/op-service
COPY ./op-batcher /app/op-batcher
COPY ./op-bindings /app/op-bindings
COPY ./kroma-validator /app/kroma-validator

COPY ./.git /app/.git
WORKDIR /app
RUN make build

FROM alpine:3.18 as runner

RUN addgroup user && \
    adduser -G user -s /bin/sh -h /home/user -D user

USER user
WORKDIR /home/user/

FROM alpine:3.18 as runner-with-kroma-log

RUN addgroup user && \
    adduser -G user -s /bin/sh -h /home/user -D user

RUN mkdir /kroma_log/ && \
    chown user:user /kroma_log

USER user
WORKDIR /home/user/

# Node
FROM runner-with-kroma-log as kroma-node
COPY --from=builder /app/bin/kroma-node /usr/local/bin

ENTRYPOINT ["kroma-node"]

# Stateviz
FROM runner-with-kroma-log as kroma-stateviz
COPY --from=builder /app/bin/kroma-stateviz /usr/local/bin

CMD ["kroma-stateviz"]

# Batcher
FROM runner as kroma-batcher
COPY --from=builder /app/bin/kroma-batcher /usr/local/bin

ENTRYPOINT ["kroma-batcher"]

# Validator
FROM runner as kroma-validator
COPY --from=builder /app/bin/kroma-validator /usr/local/bin

ENTRYPOINT ["kroma-validator"]
