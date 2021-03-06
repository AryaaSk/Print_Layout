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
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1"
        webView.load(request)
    }
    
    
    @IBAction func newImage(_ sender: Any) {
        ImagePickerManager().pickImage(self){ image in
            self.uploadImage(image: image)
        }
    }
    
    func uploadImage(image: UIImage) {  //take UIImage from local device, and upload into program with the base64 encoded string.
        let imageData = image.jpegData(compressionQuality: 0.8)!; //cant use png since it doesnt remember the orientation of the image
        let imageSrc = "data:image/png;base64, " + imageData.base64EncodedString()
        let height = Int(image.size.height * image.scale)
        let width = Int(image.size.width * image.scale)
        
        let jsCode = """
IMAGES.push(NewImageObject("\(imageSrc)", \(String(height)), \(String(width))));
UPDATE_CANVAS = true;
"""
        self.webView.evaluateJavaScript(jsCode)
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
                        printInfo.outputType = .photo //don't need to worry about paper sizes, since it changes automatically based on the printer
                        printController.printInfo = printInfo
                        printInfo.duplex = .none
                        
                        printController.present(animated: true)
                    }
                }
            }
        }
    }
    
    //MARK: Code used for the alerts and prompts inside of the website (Javascript)
    //https://stackoverflow.com/questions/34185339/wkwebview-javascript-confirm-and-alert-not-working
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        
        let alertController = UIAlertController(title: nil, message: message, preferredStyle: .actionSheet)
        
        alertController.addAction(UIAlertAction(title: "Ok", style: .default, handler: { (action) in
            completionHandler()
        }))
        
        self.present(alertController, animated: true, completion: nil)
    }
    
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        
        let alertController = UIAlertController(title: nil, message: message, preferredStyle: .actionSheet)
        
        alertController.addAction(UIAlertAction(title: "Ok", style: .default, handler: { (action) in
            completionHandler(true)
        }))
        
        alertController.addAction(UIAlertAction(title: "Cancel", style: .default, handler: { (action) in
            completionHandler(false)
        }))
        
        self.present(alertController, animated: true, completion: nil)
    }
    
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        
        let alertController = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        
        alertController.addTextField { (textField) in
            textField.text = defaultText
        }
        
        alertController.addAction(UIAlertAction(title: "Ok", style: .default, handler: { (action) in
            if let text = alertController.textFields?.first?.text {
                completionHandler(text)
            } else {
                completionHandler(defaultText)
            }
            
        }))
        
        alertController.addAction(UIAlertAction(title: "Cancel", style: .default, handler: { (action) in
            
            completionHandler(nil)
            
        }))
        
        self.present(alertController, animated: true, completion: nil)
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
