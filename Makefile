PROTO_SRC = packages/game/network/proto
PROTO_OUT = packages/game/network/generated

.PHONY: proto clear-proto-gen


proto: clear-proto-gen
	protoc \
	  --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
	  --ts_proto_out=$(PROTO_OUT) \
	  --ts_proto_opt=esModuleInterop=true,forceLong=string,oneof=unions \
	  -I $(PROTO_SRC) \
	  $(PROTO_SRC)/*.proto

clear-proto-gen:
	rm -rf $(PROTO_OUT)/*