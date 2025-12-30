<!--
title: MQTT Broker - Eclipse Mosquitto - Windows环境下使用初级教程
author: NOAH
date: 2025-12-30
-->

## 背景

MQTT（Message Queuing Telemetry Transport）是一种面向 IoT 的轻量级发布/订阅消息协议。

其中 Broker 的主要功能是：接收发布者的消息，并将其过滤后分发给相应的订阅者。

Broker 的实现有很多开源选择，本教程简单介绍来自 Eclipse 的 Mosquitto。

## 介绍

Eclipse Mosquitto 提供了一个开源 Broker 环境供使用者测试。

- Mosquitto 支持 MQTT 3.1/3.1.1，以及暂未普及的 5.0 版本
- 支持 QoS0、QoS1、QoS2
- 支持消息保留机制（Retained）
- 支持 WILL 遗嘱机制（Last Will）
- 支持多种验证方式：ClientID、Username/Password、IP、Certificate（TLS/SSL）

## 准备

### 1) 下载与安装

- 官网下载：<https://mosquitto.org/download/>
- 下载完成后，根据提示完成安装（注意安装路径选择）

## 入门使用

### 1) 启动 Mosquitto

方式一：在安装目录下双击 `mosquitto.exe`，弹出命令行窗口，启动成功。

方式二：在安装目录打开命令行窗口，执行：

```powershell
.\mosquitto.exe
```

默认情况下，Mosquitto 会监听本地 `1883` 端口。

### 2) 订阅

在 Mosquitto 正常运行且不要关闭 Mosquitto 窗口的情况下，在安装目录下打开新的命令行窗口，执行：

```powershell
.\mosquitto_sub.exe -t "topic_sub"
```

说明：

- `topic_sub` 为订阅话题
- 订阅窗口会进入等待消息发布的状态，此时不要关闭窗口

### 3) 发布

在安装目录下再打开新的命令行窗口，执行：

```powershell
.\mosquitto_pub.exe -t "topic_sub" -m "msg_pub"
```

说明：

- `msg_pub` 为发布到话题的内容
- 订阅窗口会收到 `msg_pub` 并继续等待下一次消息
- 发布窗口执行完会退出

至此，一次完整的 Mosquitto 入门使用流程结束。
