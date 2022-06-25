# Print Layout
## A small utility to help solve the problem of resizing when printing an image

### URL: https://aryaask.github.io/Print_Layout/dist

When printing an image to place somewhere, you usually want to be able to control the size at which it will be printed. However unfortuantely most of the time when you select print on an image, you will be prompted with a screen which only allows you a few pre-defined sizes, however they are not very customizable. 

This utility will allow you to quickly import 1 or more photos, and view their layout and size on a sheet of A4 (or another sized) Paper, this helps you visualize how large the photo will actually be when you print it, and eliminates the need to take the image into a much larger image/document editing program. For example many people will take the image to Microsoft Word or Adobe Photoshop, just to do a simple crop or resize, which should not be needed just to print out an image.

I am planning to add a mobile app, since it is even harder for a user to change an image's size there, however first I will create a website.\
Here are a few links to handle the 'Open With' feature of iOS:
- https://stackoverflow.com/questions/69926336/how-to-handle-a-file-shared-from-another-app-to-my-own-ios-app
- https://stackoverflow.com/questions/49154366/how-to-handle-a-file-sent-with-open-in-from-another-app-to-my-own-ios-app

Here are a few links to load a UIImage into a Website with Webkit:
- https://stackoverflow.com/questions/38743604/wkwebview-insert-uiimage-into-web-page
- https://stackoverflow.com/questions/24049343/call-javascript-function-from-native-code-in-wkwebview

## Design
I want this app to be very minimal and fast, so the design is meant to look very clean. For example I'll try to only keep a few buttons in sight, the pan and zoom will just be control by mouse/gesture and scroll/pinch for desktop/mobile. This also means that I should spend quite a lot of time adding small shortcuts, such as the ability to drag and drop, copy and paste images onto the paper. These are improvements which will make the app very easy to use.

Here is a preview on desktop:\
![Desktop Preview](Previews/DesktopPreview.png)

And here are previews of the iOS app (not available yet):\
<p float="left"> 
  <img src="Previews/iOSPreview1.png?raw=true" width="350" />
  <img src="Previews/iOSPreview2.png?raw=true" width="350" /> 
</p>

## Accuracy
Since the final outcome is for the document to be printed, I cannot fully fix all accuracy problems.\
Here is an example, I printed this test cube onto a piece of paper:

![Test cube](Previews/TestCube.JPG?raw=true)

The image is 600 x 600, and so should get scaled down, and should be **20cm x 20cm** on paper:

![Physical Print](Previews/AccuracyPreview.JPG?raw=true)

However as you can see, there is an error margin of around 0.5cm, which is quite high. Unfortunately there is almost nothing I can do to fix this, a possible solution may be to set the quality of the image to the highest possible, which is an option for some printers.

## How it works
I had to learn more about the Javascript canvas API to make this work, as well as Image Encoding techniques and how to pass data between a WebView and native iOS applicaiton.\