const registryPackageName = '@sye1321/nestjs-chapa';
const prereleaseIdentifier = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const exactVersion = `((?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-${prereleaseIdentifier}(?:\\.${prereleaseIdentifier})*)?)`;
const registryPackageSpec = new RegExp(`^${registryPackageName}@${exactVersion}$`);

export function registryDependencyVersion(packageSpec) {
  const match = registryPackageSpec.exec(packageSpec);
  if (!match) throw new Error('--package-spec must identify an exact @sye1321/nestjs-chapa version');
  return match[1];
}
