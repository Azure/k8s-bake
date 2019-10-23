# Kubernetes bake action
Use this action to bake manifest file to be used for deployments using helm2, kustomize or kompose

Assumes that the deployment target K8s cluster context was set earlier in the workflow by using either Azure/aks-set-context or Azure/k8s-set-context 

Sets output variable 'manifestsBundle' which contains the location of the manifest bundles created by bake action

#### Bake using Helm2
```yaml
- uses: azure/k8s-bake@v1
   with:
      renderEngine: 'helm2'
      helmChart: './aks-helloworld/' 
      overrideFiles: './aks-helloworld/values-override.yaml'
      overrides: |     
          replicas:2
      helm-version: 'latest' 
```

#### Bake using Kompose
```yaml
- uses: azure/k8s-bake@v1
   with:
     renderEngine: 'kompose'
        dockerComposeFile: './docker-compose.yml'
        kompose-version: 'latest'     
```

#### Bake using Kubernetes Kustomize
```yaml
- uses: azure/k8s-bake@v1
   with:
      with:
        renderEngine: 'kustomize'
        kustomizationPath: './kustomizeexample/'
        kubectl-version: 'latest'
```
Refer to the action metadata file for details about all the inputs https://github.com/Azure/k8s-bake/blob/master/action.yml

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
