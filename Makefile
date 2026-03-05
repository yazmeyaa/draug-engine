PROTO_SRC = packages/game/network/proto
PROTO_OUT = packages/game/network/generated

.PHONY: proto

proto:
	protoc \
	  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
	  --ts_proto_out=$(PROTO_OUT) \
	  --ts_proto_opt=esModuleInterop=true,forceLong=string \
	  -I $(PROTO_SRC) \
	  $(PROTO_SRC)/*.proto