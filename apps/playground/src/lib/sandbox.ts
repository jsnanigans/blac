import React from 'react';
import ReactDOM from 'react-dom/client';
import * as BlacCore from '@blac/core';
import * as BlacReact from '@blac/react';

export interface SandboxResult {
  success: boolean;
  error?: string;
  logs: string[];
  component?: React.ComponentType;
}

export class Sandbox {
  private iframe: HTMLIFrameElement | null = null;
  private logs: string[] = [];
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
  };
  
  constructor() {
    // Don't capture console in constructor
  }
  
  private setupConsoleCapture() {
    const capture = (type: string, ...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      this.logs.push(`[${type}] ${message}`);
    };
    
    console.log = (...args) => {
      capture('log', ...args);
      this.originalConsole.log(...args);
    };
    
    console.error = (...args) => {
      capture('error', ...args);
      this.originalConsole.error(...args);
    };
    
    console.warn = (...args) => {
      capture('warn', ...args);
      this.originalConsole.warn(...args);
    };
  }
  
  private restoreConsole() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
  }
  
  async execute(code: string, _containerId?: string): Promise<SandboxResult> {
    this.logs = [];
    this.setupConsoleCapture();
    
    try {
      // Make libraries available globally for the sandbox
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).BlacCore = BlacCore;
      (window as any).BlacReact = BlacReact;
      
      // Store for the exported component
      let exportedComponent: React.ComponentType | null = null;
      
      // Create a sandboxed environment with necessary imports injected
      const sandboxedCode = `
        const React = window.React;
        const ReactDOM = window.ReactDOM;
        const { Bloc, Cubit, BlocBase, Blac } = window.BlacCore;
        const { useBloc, useExternalBlocStore } = window.BlacReact;
        
        // User code starts here
        ${code}
        
        // Try to find and return the main component
        // Look for common component names
        if (typeof Counter !== 'undefined') return Counter;
        if (typeof App !== 'undefined') return App;
        if (typeof Component !== 'undefined') return Component;
        if (typeof Demo !== 'undefined') return Demo;
        if (typeof Example !== 'undefined') return Example;
        if (typeof Main !== 'undefined') return Main;
        
        // Log success even if no component found
        console.log('Code executed successfully');
        return null;
      `;
      
      // Execute the code and capture the returned component
      const executeCode = new Function(sandboxedCode);
      exportedComponent = executeCode();
      
      this.restoreConsole();
      
      return {
        success: true,
        logs: this.logs,
        component: exportedComponent || undefined,
      };
    } catch (error) {
      this.restoreConsole();
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        logs: this.logs,
      };
    }
  }
  
  cleanup() {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }
}

export function createSandbox(): Sandbox {
  return new Sandbox();
}