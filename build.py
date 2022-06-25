#Run this to build the entire project into a single dist folder
#Make sure the latest version of the TS files are compiled to the _JS folder
#Also make sure that no files have the same name, since they all end up in a singular directory

srcFolder = "./Src" #html + css
compiledJSFolder = "./_JS"
assetsFolder = "./Assets"

import os
import fnmatch
import shutil

class File:
    path: str
    name: str
    type: str
    def __init__(self, path, name, type):
        self.path = path
        self.name = name
        self.type = type

filePaths: list[File] = []

#Get files from Src folder and _JS folder
for path,dirs,files in os.walk(srcFolder):
    for file in fnmatch.filter(files, '*.html'):
        filePaths.append(File(f"{path}/{file}", file, "html"))
    for file in fnmatch.filter(files, '*.css'):
        filePaths.append(File(f"{path}/{file}", file, "css"))
    for file in fnmatch.filter(files, '*.json'):
        filePaths.append(File(f"{path}/{file}", file, "json"))
for path,dirs,files in os.walk(compiledJSFolder):
    for file in fnmatch.filter(files, '*.js'):
        filePaths.append(File(f"{path}/{file}", file, "js"))
for path,dirs,files in os.walk(assetsFolder):
    for file in files:
        filePaths.append(File(f"{path}/{file}", file, "asset"))



#Generate SearchFor and ReplaceWith strings (just the file paths to be replaced)
class FilePath:
    searchFor: str
    replaceWith: str
    def __init__(self, searchFor, replaceWith):
        self.searchFor = searchFor
        self.replaceWith = replaceWith

searchReplace: list[FilePath] = []
for file in filePaths:
    srcPath = file.path[1:]
    destPath = f"{file.name}"
    searchReplace.append(FilePath(srcPath, destPath))
searchReplace.append(FilePath("/Assets/", "")) #since all the assets will be in the same directory

if os.path.isdir('dist/'): #delete and generate new dist folder if it already exists (to clear contents)
    shutil.rmtree('dist/')
os.mkdir("dist/")


#Add / Modify files, into a dist folder
for file in filePaths:
    srcPath = file.path
    destPath = f"dist/{file.name}"

    if (file.type == "asset"): #don't interfere with file if it is an asset
        shutil.copy2(srcPath, destPath)
        continue

    f = open(srcPath, "r")
    try:
        lines = f.readlines()
    except:
        print(f"Unable to parse file: {srcPath}")
    f.close()

    fileString = "" #we need to modify this data, especially the <script> tags in the HTML
    for line in lines:
            #for each line of the file, we need to try and replace all the paths in searchReplace
            for path in searchReplace:
                line = line.replace(path.searchFor, path.replaceWith)

            fileString += line
        
        

    f = open(destPath, 'w')
    f.write(fileString)
    f.close()

print("Successfully built project, output is in the dist folder")