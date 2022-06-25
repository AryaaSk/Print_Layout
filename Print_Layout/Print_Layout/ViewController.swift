//
//  ViewController.swift
//  Print_Layout
//
//  Created by Aryaa Saravanakumar on 25/06/2022.
//

import UIKit
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate {
    
    @IBOutlet var webView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        
        webView.uiDelegate = self
        webView.navigationDelegate = self
        
        //let url = "http://127.0.0.1:8080/main.html?hideTaskbar=true" //change to actual url later
        let url = "https://aryaask.github.io/Print_Layout/dist/main.html?hideTaskbar=true" //github pages url
        let request = URLRequest(url: URL(string: url)!)
        webView.load(request)
    }
    
    
    
    @IBAction func newImage(_ sender: Any) { //take UIImage from local device, and upload into program with the base64 encoded string.
        ImagePickerManager().pickImage(self){ image in
            
            let imageData = image.jpegData(compressionQuality: 0.8)!;
            let imageSrc = "data:image/png;base64, " + imageData.base64EncodedString()
            let height = Int(image.size.height * image.scale)
            let width = Int(image.size.width * image.scale)
             
            let jsCode = """
IMAGES.push(NewImageObject("\(imageSrc)", \(String(height)), \(String(width))));
UPDATE_CANVAS = true;
"""
            self.webView.evaluateJavaScript(jsCode)
        }
    }
    
    
    
    @IBAction func printImage(_ sender: Any) { //get canvas as image using .toDataURL(), then decode in swift, and give to user to print
        webView.evaluate(script: "enlargeCanvas();") { prevZoom, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { //wait 3 seconds, similar to setTimeout(() => {}, 3000); in JS
                self.webView.evaluate(script: "GetCanvasBase64Encoded();") { data, error in
                    self.webView.evaluateJavaScript("revertCanvas(\(prevZoom!))")
                    
                    let base64 = data! as! String
                    
                    if let decodedData = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) {
                        let image = UIImage(data: decodedData)!

                        //now just print the image
                        let printController = UIPrintInteractionController.shared
                        printController.printingItem = image
                        printController.showsPaperSelectionForLoadedPapers = true
                        
                        let printInfo = UIPrintInfo.printInfo()
                        printInfo.outputType = .general //dont want to set to .photo since that doesnt allow A4 papers (I can't find out how to change it)
                        printController.printInfo = printInfo
                        
                        let printFormatter = UIPrintFormatter();
                        printFormatter.perPageContentInsets = UIEdgeInsets(top: -20, left: -20, bottom: -20, right: -20) //I cant seem to get rid of the border around the photo
                        
                        printController.present(animated: true)
                    }
                }
            }
        }
    }
    

}

extension WKWebView { //https://stackoverflow.com/questions/26778955/wkwebview-evaluate-javascript-return-value
    func evaluate(script: String, completion: @escaping (Any?, Error?) -> Void) {
        var finished = false
        
        evaluateJavaScript(script, completionHandler: { (result, error) in
            if error == nil {
                if result != nil {
                    completion(result, nil)
                }
            } else {
                completion(nil, error)
            }
            finished = true
        })
        
        while !finished {
            RunLoop.current.run(mode: RunLoop.Mode(rawValue: "NSDefaultRunLoopMode"), before: NSDate.distantFuture)
        }
    }
}
