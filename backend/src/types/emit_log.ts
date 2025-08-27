/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/emit_log.json`.
 */
export type EmitLog = {
  "address": "GmLHkec7uKSM1ahLZvR7aiUvyzXxVTb8gZbaqdHj3kSH",
  "metadata": {
    "name": "emitLog",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    }
  ],
  "events": [
    {
      "name": "myEvent",
      "discriminator": [
        96,
        184,
        197,
        243,
        139,
        2,
        90,
        148
      ]
    },
    {
      "name": "mySecondEvent",
      "discriminator": [
        48,
        215,
        165,
        169,
        66,
        156,
        9,
        164
      ]
    }
  ],
  "types": [
    {
      "name": "myEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mySecondEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "message",
            "type": "string"
          }
        ]
      }
    }
  ]
};
