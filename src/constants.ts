// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Kept in a dedicated module so the post-job cleanup entry point does not have
// to bundle utilities.ts and its dependencies just to read these.

export const BAKE_OUTPUT_DIRNAME = '.k8s-bake'

export const BAKED_MANIFEST_PREFIX = 'baked-template-'
export const BAKED_MANIFEST_PATTERN = /^baked-template-\d+\.yaml$/

// Filename the main step generated, read back by the post-job step. Stored as a
// basename and re-validated on read, since step state travels as a STATE_*
// environment variable.
export const CLEANUP_STATE_KEY = 'bakedManifestFile'
