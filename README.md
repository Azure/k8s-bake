# Kubernetes bake action

Use this action to bake manifest file to be used for deployments using helm, kustomize or kompose.

Sets output variable 'manifestsBundle' which contains the location of the manifest bundles created by bake action.

## Example

#### Bake using helm

```yaml
- uses: azure/k8s-bake@v2
   with:
      renderEngine: 'helm'
      helmChart: './aks-helloworld/'
      overrideFiles: './aks-helloworld/values-override.yaml'
      overrides: |
          replicas:2
      helm-version: 'latest'
      silent: 'false'
```

#### Bake using Kompose

```yaml
- uses: azure/k8s-bake@v2
  with:
    renderEngine: "kompose"
    dockerComposeFile: "./docker-compose.yml"
    kompose-version: "latest"
```

#### Bake using Kubernetes Kustomize

```yaml
- uses: azure/k8s-bake@v2
  with:
    renderEngine: "kustomize"
    kustomizationPath: "./kustomizeexample/"
    kubectl-version: "latest"
```

Refer to the [action metadata file](https://github.com/Azure/k8s-bake/blob/master/action.yml) for details about all the inputs.

## End to end workflow for building container images and deploying to a Kubernetes cluster

```yaml
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master

      - uses: Azure/docker-login@v1
        with:
          login-server: contoso.azurecr.io
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - run: |
          docker build . -t contoso.azurecr.io/k8sdemo:${{ github.sha }}
          docker push contoso.azurecr.io/k8sdemo:${{ github.sha }}

      - uses: Azure/k8s-set-context@v1
        with:
          kubeconfig: ${{ secrets.KUBE_CONFIG }}

      - uses: Azure/k8s-create-secret@v1
        with:
          container-registry-url: contoso.azurecr.io
          container-registry-username: ${{ secrets.REGISTRY_USERNAME }}
          container-registry-password: ${{ secrets.REGISTRY_PASSWORD }}
          secret-name: demo-k8s-secret

      - uses: azure/k8s-bake@v2
        with:
          renderEngine: "helm"
          helmChart: "./aks-helloworld/"
          overrideFiles: "./aks-helloworld/values-override.yaml"
          overrides: |
            replicas:2
          helm-version: "latest"
        id: bake

      - uses: Azure/k8s-deploy@v1
        with:
          manifests: ${{ steps.bake.outputs.manifestsBundle }}
          images: |
            demo.azurecr.io/k8sdemo:${{ github.sha }}
          imagepullsecrets: |
            demo-k8s-secret
```

# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
